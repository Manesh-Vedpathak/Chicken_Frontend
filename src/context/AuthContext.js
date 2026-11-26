import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "user";
const TOKEN_STORAGE_KEY = "token";

// =====================================
// NORMALIZE USER ROLE
// =====================================

const normalizeRole = (role) => {
  const normalizedRole = String(role || "")
    .trim()
    .toUpperCase();

  if (
    normalizedRole === "ADMIN" ||
    normalizedRole === "ROLE_ADMIN"
  ) {
    return "ADMIN";
  }

  if (
    ["CUSTOMER", "USER", "ROLE_USER", "ROLE_CUSTOMER"].includes(
      normalizedRole
    )
  ) {
    return "CUSTOMER";
  }

  return null;
};

// =====================================
// READ SAVED USER
// =====================================

const readSavedUser = () => {
  try {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (!savedUser) return null;

    const parsedUser = JSON.parse(savedUser);
    const role = normalizeRole(parsedUser?.role);

    if (!role) return null;

    return {
      ...parsedUser,
      role,
    };

  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

// =====================================
// READ SAVED TOKEN
// =====================================

const readSavedToken = () =>
  localStorage.getItem(TOKEN_STORAGE_KEY);

// =====================================
// AUTH PROVIDER
// =====================================

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(readSavedUser);
  const [token, setToken] = useState(readSavedToken);
  const [loading, setLoading] = useState(false);

  // =====================================
  // SAVE TOKEN
  // =====================================

  useEffect(() => {

    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

  }, [token]);

  // =====================================
  // SAVE USER
  // =====================================

  useEffect(() => {

    if (user) {
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(user)
      );
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }

  }, [user]);

  // =====================================
  // LOGIN
  // =====================================

  const login = async (email, password) => {

    setLoading(true);

    try {

      // Correct API endpoint
      // api.js already contains /api in baseURL

      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      if (!data?.success || !data?.token) {

        return {
          success: false,
          message: data?.message || "Login failed.",
        };
      }

      const role = normalizeRole(data.role);

      if (!role) {

        console.error(
          "Unsupported login role returned by backend:",
          data.role
        );

        return {
          success: false,
          message: `Unsupported account role: ${
            data.role || "missing"
          }. Please check the backend login response.`,
        };
      }

      const loggedInUser = {

        id: data.userId ?? data.id,

        name: data.name,

        email: data.email || email.trim(),

        role,

      };

      setToken(data.token);
      setUser(loggedInUser);

      return {
        success: true,
        user: loggedInUser,
        message: data.message || "Login successful.",
      };

    } catch (error) {

      console.error("Login error:", error);

      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;

      let message = "Unable to connect to the server.";

      if (status === 400) {
        message = backendMessage || "Invalid login request.";
      } else if (status === 401) {
        message = backendMessage || "Invalid email or password.";
      } else if (status === 403) {
        message = backendMessage || "Access forbidden. Please check your account status and backend security configuration.";
      } else if (status >= 500) {
        message = backendMessage || "Server error. Please try again later.";
      } else if (backendMessage) {
        message = backendMessage;
      }

      return {
        success: false,
        message,
      };

    } finally {

      setLoading(false);

    }
  };

  // =====================================
  // REGISTER
  // =====================================

  const register = async (userData) => {

    setLoading(true);

    try {

      // Correct API endpoint
      // api.js already contains /api in baseURL

      const response = await api.post("/auth/register", {

        name: userData.name.trim(),

        email: userData.email.trim(),

        phone: userData.phone.trim(),

        password: userData.password,

        address: userData.address?.trim() || "",

      });

      const data = response.data;

      if (data?.success === false) {

        return {
          success: false,
          message: data.message || "Registration failed.",
        };
      }

      return {
        success: true,
        message: data?.message || "Registration successful.",
      };

    } catch (error) {

      console.error("Registration error:", error);

      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;

      let message = "Unable to register. Please try again.";

      if (status === 400) {

        message =
          backendMessage || "Please check your registration details.";

      } else if (status === 409) {

        message =
          backendMessage ||
          "An account with these details may already exist.";

      } else if (status === 403) {

        message =
          backendMessage ||
          "Registration was blocked by the server.";

      } else if (status >= 500) {

        message =
          backendMessage ||
          "Server error. Please try again later.";

      } else if (backendMessage) {

        message = backendMessage;

      }

      return {
        success: false,
        message,
      };

    } finally {

      setLoading(false);

    }
  };

  // =====================================
  // LOGOUT
  // =====================================

  const logout = () => {

    setUser(null);
    setToken(null);

    localStorage.removeItem("customerProfile");

  };

  // =====================================
  // AUTHENTICATION STATUS
  // =====================================

  const isAuthenticated = Boolean(token && user);

  const isAdmin = user?.role === "ADMIN";

  // =====================================
  // PROVIDER
  // =====================================

  return (

    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated,
        isAdmin,
      }}
    >

      {children}

    </AuthContext.Provider>

  );
};

// =====================================
// USE AUTH HOOK
// =====================================

export const useAuth = () => {

  const context = useContext(AuthContext);

  if (!context) {

    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );

  }

  return context;

};

export default AuthContext;