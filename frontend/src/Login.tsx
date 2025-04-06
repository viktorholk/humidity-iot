import { useState } from "react";
import { login } from "./Service";

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  onSwitchToRegister: () => void; // Callback to switch to the register form
  successMessage?: string; // Optional success message
}

const Login = ({
  onLoginSuccess,
  onSwitchToRegister,
  successMessage,
}: LoginProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const response = await login(username, password);
      const token = response.token; // Assuming the API returns a token field
      if (token) {
        localStorage.setItem("jwtToken", token); // Store token in local storage
        onLoginSuccess(token); // Notify parent component
      } else {
        setError("Invalid login response");
      }
    } catch (err) {
      setError("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {successMessage && <p className="success">{successMessage}</p>}{" "}
      {/* Display success message */}
      {error && <p className="error">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
      <p>
        Don't have an account?{" "}
        <button className="link-button" onClick={onSwitchToRegister}>
          Register here
        </button>
      </p>
    </div>
  );
};

export default Login;
