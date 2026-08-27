import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { useAuthSession } from "../auth/auth-context";

/** Product context and the protected sign-in action stay distinct at every breakpoint. */
export function LoginPage() {
  const auth = useAuthSession();
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><BrandMark /><span>Ocular climate intelligence</span></div>
        <div className="login-copy">
          <p className="eyebrow">Twelve cities · one explainable index</p>
          <h1>See the climate<br />your eyes meet.</h1>
          <p>Live temperature, humidity and airflow translated into a ranked 0–100 ocular environment score.</p>
        </div>
        <div className="login-proof" aria-label="Product capabilities">
          <span><strong>12</strong> cities ranked</span>
          <span><strong>5m</strong> weather cache</span>
          <span><strong>3</strong> live inputs</span>
        </div>
      </section>
      <section className="login-access" aria-labelledby="access-title">
        <div className="access-card">
          <span className="access-icon"><LockKeyhole size={19} /></span>
          <p className="eyebrow">Protected workspace</p>
          <h2 id="access-title">Secure sign in</h2>
          <p>Continue to the live ranking dashboard through the configured Auth0 identity provider.</p>
          <button className="primary-button" onClick={() => void auth.login()} type="button">Continue with Auth0 <ArrowRight size={18} /></button>
          <div className="security-note"><ShieldCheck size={17} /><span>Authorization Code with PKCE<br />Dashboard and Worker API are protected</span></div>
        </div>
      </section>
    </main>
  );
}
