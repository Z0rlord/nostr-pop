import Arweave from "arweave";
import { readFileSync } from "fs";

// Initialize Arweave
const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: "https",
});

// Load wallet key from server-only location
let walletKey: any = null;
try {
  walletKey = JSON.parse(readFileSync("/opt/dojopop/keys/arweave.json", "utf8"));
} catch (e) {
  console.error("Arweave key not found at /opt/dojopop/keys/arweave.json");
}

export interface CheckInRecord {
  studentId: string;
  studentName: string;
  rank: string;
  stripes: number;
  timestamp: string;
  className: string;
  instructorName: string;
  dojoName: string;
  dojoLocation: { lat: number; lng: number };
  checkInLocation?: { lat: number; lng: number; accuracy: number };
  status: "present" | "late" | "absent";
}

export interface WeeklyBatch {
  dojo: {
    id: string;
    name: string;
    location: string;
    lat: number;
    lng: number;
  };
  week: string;
  weekStarting: string;
  instructors: Array<{ id: string; name: string }>;
  checkIns: CheckInRecord[];
  rankTests: Array<{
    student: { id: string; name: string };
    oldRank: string;
    newRank: string;
    stripes: number;
    testedBy: string;
    date: string;
    passed: boolean;
  }>;
  seminars: Array<{
    title: string;
    instructor: string;
    date: string;
    attendees: number;
    location?: { lat: number; lng: number };
  }>;
  submittedBy: string;
  submittedAt: string;
}

export async function uploadToArweave(data: WeeklyBatch): Promise<{ id: string; url: string } | null> {
  if (!walletKey) {
    console.error("Arweave wallet not configured");
    return null;
  }

  try {
    const jsonData = JSON.stringify(data, null, 2);
    
    const transaction = await arweave.createTransaction({ data: jsonData }, walletKey);
    
    // Add tags for indexing
    transaction.addTag("App-Name", "DojoPop");
    transaction.addTag("App-Version", "1.0.0");
    transaction.addTag("Content-Type", "application/json");
    transaction.addTag("Dojo-Id", data.dojo.id);
    transaction.addTag("Dojo-Name", data.dojo.name);
    transaction.addTag("Week", data.week);
    transaction.addTag("Type", "WeeklyBatch");
    transaction.addTag("CheckIn-Count", data.checkIns.length.toString());
    
    await arweave.transactions.sign(transaction, walletKey);
    
    const response = await arweave.transactions.post(transaction);
    
    if (response.status === 200) {
      return {
        id: transaction.id,
        url: `https://arweave.net/${transaction.id}`,
      };
    } else {
      console.error("Arweave upload failed:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Arweave upload error:", error);
    return null;
  }
}

// These functions are server-only and not exposed to the client
export async function getWalletBalance(): Promise<string> {
  if (!walletKey) return "0";
  
  try {
    const address = await arweave.wallets.jwkToAddress(walletKey);
    const balance = await arweave.wallets.getBalance(address);
    return arweave.ar.winstonToAr(balance);
  } catch (e) {
    return "0";
  }
}

export async function getWalletAddress(): Promise<string | null> {
  if (!walletKey) return null;
  
  try {
    return await arweave.wallets.jwkToAddress(walletKey);
  } catch (e) {
    return null;
  }
}
