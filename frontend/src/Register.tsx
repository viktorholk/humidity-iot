import { useState } from "react";
import { registerUser } from "./Service"; // Assuming this function exists in your service

interface RegisterProps {
  onSwitchToLogin: (message?: string) => void; // Callback to switch to the login form
}

const Register = ({ onSwitchToLogin }: RegisterProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const response = await registerUser(username, password); // Call the service
      if (response.id) {
        setError(null);
        onSwitchToLogin("Registration successful! You can now log in."); // Pass success message
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h2>Register</h2>
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
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <button onClick={handleRegister}>Register</button>
      <p className="switch-to-login">
        Already have an account?{" "}
        <button
          className="link-button"
          onClick={() => onSwitchToLogin(undefined)}
        >
          {" "}
          {/* Explicitly pass undefined */}
          Login here
        </button>
      </p>
    </div>
  );
};

export default Register;
