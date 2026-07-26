import { CloudOff } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="not-found">
      <span>
        <CloudOff />
      </span>
      <em>404</em>
      <h1>That route isn’t in the event map</h1>
      <p>The page may have moved, or the order identifier is no longer available.</p>
      <Link to="/" className="button primary">
        Return to dashboard
      </Link>
    </div>
  );
}
