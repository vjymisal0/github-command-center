import { PageHeader } from '../components';

export default function LoginPage() {
  return <section><PageHeader eyebrow="Account" title="Sign in"><p>Local instance login. Demo credentials: <code>admin@example.com</code> / <code>password</code>.</p></PageHeader><form className="panel login" action="http://localhost:4000/auth/login" method="post"><label>Email<input name="email" type="email" defaultValue="admin@example.com" required /></label><label>Password<input name="password" type="password" defaultValue="password" required /></label><button className="button" type="submit">Sign in</button></form></section>;
}
