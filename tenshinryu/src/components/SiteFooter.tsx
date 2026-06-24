import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="bg-frame text-white mt-auto">
      <div className="section-pad !py-10 !text-white">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo-icon.png" alt="" width={36} height={36} />
              <div>
                <span className="font-heading text-lg block">TENSHINRYU</span>
                <span className="text-xs text-white/60">KIWAMI -極-</span>
              </div>
            </div>
            <p className="text-sm text-white/70">
              Japanese Tradition Tenshinryu Hyoho
            </p>
          </div>
          <div>
            <h4 className="font-heading text-base mb-3">Training</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/signup" className="hover:text-white">
                  Join
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/member" className="hover:text-white">
                  Member Area
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-base mb-3">Connect</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <a
                  href="https://youtube.com/@tenshinryu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  YouTube
                </a>
              </li>
              <li>
                <a
                  href="https://international.tenshinryu.net/tenshinryu-online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  International Site
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-heading text-base mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/50">
          <p>
            © {new Date().getFullYear()} JAPANESE TRADITION TENSHINRYU HYOHO. ALL RIGHTS
            RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
