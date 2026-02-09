import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const rootElement = document.getElementById("root")!;
const app = <App />;

createRoot(rootElement).render(
	googleClientId
		? (
			<GoogleOAuthProvider clientId={googleClientId}>
				{app}
			</GoogleOAuthProvider>
		)
		: app
);
