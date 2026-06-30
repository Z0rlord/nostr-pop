import { Injectable, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service.js';

export type PasskeyRegistrationMode = 'security-key' | 'platform';

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);
  private readonly rpName: string;
  private readonly rpId: string;
  private readonly origin: string;

  private readonly challenges = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {
    this.rpName = process.env['WEBAUTHN_RP_NAME'] ?? 'Bunker46';
    this.rpId = process.env['WEBAUTHN_RP_ID'] ?? 'localhost';
    this.origin = process.env['WEBAUTHN_ORIGIN'] ?? 'http://localhost:5173';
  }

  async generateRegistrationOptions(
    userId: string,
    username: string,
    mode: PasskeyRegistrationMode = 'security-key',
  ) {
    const existingPasskeys = await this.prisma.passkey.findMany({
      where: { userId },
    });

    // platform: Touch ID / Face ID on this Mac.
    // security-key: cross-platform + UV required — Safari roaming keys hang silently with
    // UV preferred (credProtect L3 mismatch). Chrome on macOS is the reliable fallback.
    const authenticatorSelection =
      mode === 'platform'
        ? {
            authenticatorAttachment: 'platform' as const,
            residentKey: 'required' as const,
            userVerification: 'preferred' as const,
          }
        : {
            authenticatorAttachment: 'cross-platform' as const,
            residentKey: 'preferred' as const,
            userVerification: 'required' as const,
          };

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: new TextEncoder().encode(userId),
      userName: username,
      attestationType: 'none',
      timeout: 120_000,
      supportedAlgorithmIDs: [-7],
      excludeCredentials: existingPasskeys.map((p) => ({
        id: p.credentialId,
        transports: p.transports as any[],
      })),
      authenticatorSelection,
    });

    this.challenges.set(userId, options.challenge);
    return options;
  }

  async verifyRegistration(userId: string, response: RegistrationResponseJSON) {
    const expectedChallenge = this.challenges.get(userId);
    if (!expectedChallenge) {
      this.logger.warn(`Passkey register verify: no challenge for user ${userId}`);
      throw new Error('No challenge found');
    }

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.origin,
        expectedRPID: this.rpId,
      });
    } catch (err) {
      this.logger.warn(
        `Passkey register verify failed for user ${userId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      throw err;
    }

    if (!verification.verified || !verification.registrationInfo) {
      this.logger.warn(`Passkey register verify: attestation not verified for user ${userId}`);
      throw new Error('Registration verification failed');
    }

    const { credential } = verification.registrationInfo;

    await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: (response.response.transports as string[]) ?? [],
      },
    });

    this.challenges.delete(userId);
    return verification;
  }

  async generateAuthenticationOptions(username?: string) {
    if (username) {
      const user = await this.prisma.user.findUnique({
        where: { username },
        include: { passkeys: true },
      });
      if (!user) throw new Error('User not found');

      const options = await generateAuthenticationOptions({
        rpID: this.rpId,
        allowCredentials: user.passkeys.map((p) => ({
          id: p.credentialId,
          transports: p.transports as any[],
        })),
        userVerification: 'preferred',
      });

      this.challenges.set(user.id, options.challenge);
      return { options, userId: user.id };
    }

    // Usernameless: no allowCredentials so the browser shows discoverable passkeys
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      allowCredentials: [],
      userVerification: 'preferred',
    });
    this.challenges.set(options.challenge, options.challenge);
    return { options, userId: undefined };
  }

  /**
   * Verify passkey authentication. If userId is omitted (usernameless flow),
   * the user is resolved from the credential id in the response.
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    userId?: string,
  ): Promise<{
    verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    userId: string;
  }> {
    const passkey = await this.prisma.passkey.findUnique({
      where: { credentialId: response.id },
    });
    if (!passkey) throw new Error('Passkey not found');
    const resolvedUserId = userId ?? passkey.userId;
    if (passkey.userId !== resolvedUserId) throw new Error('Passkey not found');

    const expectedChallenge =
      userId !== undefined
        ? this.challenges.get(userId)
        : (() => {
            const json = Buffer.from(response.response.clientDataJSON, 'base64url').toString(
              'utf8',
            );
            const clientData = JSON.parse(json) as { challenge: string };
            return clientData.challenge;
          })();
    if (!expectedChallenge) throw new Error('No challenge found');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpId,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.credentialPublicKey,
        counter: Number(passkey.counter),
        transports: passkey.transports as any[],
      },
    });

    if (verification.verified) {
      await this.prisma.passkey.update({
        where: { id: passkey.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) },
      });
      if (userId !== undefined) this.challenges.delete(userId);
      else this.challenges.delete(expectedChallenge);
    }

    return { verification, userId: passkey.userId };
  }

  async listPasskeys(userId: string) {
    const passkeys = await this.prisma.passkey.findMany({
      where: { userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return passkeys;
  }

  async deletePasskey(userId: string, passkeyId: string) {
    const passkey = await this.prisma.passkey.findUnique({ where: { id: passkeyId } });
    if (!passkey) throw new NotFoundException('Passkey not found');
    if (passkey.userId !== userId) throw new ForbiddenException('Not your passkey');
    await this.prisma.passkey.delete({ where: { id: passkeyId } });
  }
}
