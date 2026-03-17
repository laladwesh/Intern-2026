import * as msal from "@azure/msal-node";

const hasValidAzureConfig = () => {
  const required = [
    process.env.AZURE_CLIENT_ID,
    process.env.AZURE_CLIENT_SECRET,
    process.env.AZURE_TENANT_ID,
    process.env.AZURE_REDIRECT_URI,
  ];

  return required.every(
    (value) =>
      value &&
      !value.startsWith("your_") &&
      value.trim().length > 0
  );
};

const getMsalInstance = () => {
  if (!hasValidAzureConfig()) {
    throw new Error(
      "Azure Outlook auth is not configured. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, and AZURE_REDIRECT_URI in .env"
    );
  }

  const msalConfig = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
  };

  return new msal.ConfidentialClientApplication(msalConfig);
};

export const getAuthUrl = async () => {
  const msalInstance = getMsalInstance();
  const authCodeUrlParameters = {
    scopes: ["user.read", "openid", "profile", "email"],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  };
  return await msalInstance.getAuthCodeUrl(authCodeUrlParameters);
};

export const acquireTokenByCode = async (code) => {
  const msalInstance = getMsalInstance();
  const tokenRequest = {
    code,
    scopes: ["user.read", "openid", "profile", "email"],
    redirectUri: process.env.AZURE_REDIRECT_URI,
  };
  return await msalInstance.acquireTokenByCode(tokenRequest);
};
