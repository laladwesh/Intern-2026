// Simple hardcoded authentication for share platform
const SHARE_USERNAME = "ccd@goat";
const SHARE_PASSWORD = "awie";

export const shareAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ 
      message: "Authentication required",
      authenticated: false 
    });
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");
    const [username, password] = credentials.split(":");

    if (username === SHARE_USERNAME && password === SHARE_PASSWORD) {
      next();
    } else {
      return res.status(401).json({ 
        message: "Invalid credentials",
        authenticated: false 
      });
    }
  } catch (error) {
    return res.status(401).json({ 
      message: "Invalid authentication format",
      authenticated: false 
    });
  }
};

export const checkShareAuth = (req, res) => {
  return res.status(200).json({ 
    message: "Authenticated successfully",
    authenticated: true 
  });
};
