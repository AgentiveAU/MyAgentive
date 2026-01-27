import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.js";
import { getDatabase } from "../db/database.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      authType?: "web" | "api";
    }
  }
}

// Create a new auth token
export function createAuthToken(userType: "web" | "api" = "web"): string {
  const db = getDatabase();
  const token = uuidv4();
  const now = new Date().toISOString();
  // Web tokens expire in 7 days, API tokens don't expire
  const expiresAt =
    userType === "web"
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  db.prepare(
    `INSERT INTO auth_tokens (id, user_type, created_at, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(token, userType, now, expiresAt);

  return token;
}

// Validate auth token
export function validateToken(token: string): { valid: boolean; userType?: string } {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT * FROM auth_tokens
       WHERE id = ?
       AND (expires_at IS NULL OR expires_at > datetime('now'))`
    )
    .get(token) as any;

  if (!row) {
    return { valid: false };
  }

  // Update last used
  db.prepare("UPDATE auth_tokens SET last_used_at = datetime('now') WHERE id = ?").run(
    token
  );

  return { valid: true, userType: row.user_type };
}

// Delete auth token
export function deleteToken(token: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM auth_tokens WHERE id = ?").run(token);
}

// Delete expired auth tokens from the database
export function cleanupExpiredTokens(): number {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM auth_tokens WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')")
    .run();
  return result.changes;
}

// Verify password
export function verifyPassword(password: string): boolean {
  return password === config.webPassword;
}

// Verify API key
export function verifyApiKey(apiKey: string): boolean {
  return apiKey === config.apiKey;
}

// Express middleware for authentication
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check for session cookie
  const sessionToken = req.cookies?.session;
  if (sessionToken) {
    const { valid, userType } = validateToken(sessionToken);
    if (valid) {
      req.userId = sessionToken;
      req.authType = userType as "web" | "api";
      return next();
    }
  }

  // Check for API key in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);
    if (verifyApiKey(apiKey)) {
      req.userId = "api";
      req.authType = "api";
      return next();
    }
  }

  // Check for API key in query parameter (for WebSocket)
  const queryApiKey = req.query.api_key as string;
  if (queryApiKey && verifyApiKey(queryApiKey)) {
    req.userId = "api";
    req.authType = "api";
    return next();
  }

  // Not authenticated
  res.status(401).json({ error: "Authentication required" });
}

// Optional auth middleware (doesn't block, just sets user info if available)
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies?.session;
  if (sessionToken) {
    const { valid, userType } = validateToken(sessionToken);
    if (valid) {
      req.userId = sessionToken;
      req.authType = userType as "web" | "api";
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);
    if (verifyApiKey(apiKey)) {
      req.userId = "api";
      req.authType = "api";
    }
  }

  next();
}
