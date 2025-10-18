import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { SignOptions, Secret } from "jsonwebtoken";

import { env } from "./env";
import { supabase } from "./supabase";
import type {
  AppUser,
  AppUserRecord,
  AppUserRow,
  AuthTokenPayload
} from "./types";

const USERS_TABLE = "app_users";
const SALT_ROUNDS = 12;
const TOKEN_EXPIRATION: SignOptions["expiresIn"] = `${env.sessionDurationDays}d`;

type UserRowLike = AppUserRow | AppUserRecord;

export interface CreateUserInput {
  email: string;
  password: string;
  fullName?: string | null;
}

export interface CreateUserResult {
  user: AppUser;
}

export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert({
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: input.fullName?.trim() || null,
      role: "user",
      is_active: true,
      created_at: now,
      updated_at: now
    })
    .select("id, email, full_name, role, is_active, created_at, updated_at")
    .single();

  if (error) {
    const enhancedError = new Error(`Failed to create user: ${error.message}`);
    if (typeof error === "object" && error && "code" in error) {
      // @ts-expect-error augmenting error with original code for upstream handling
      enhancedError.code = error.code;
    }
    throw enhancedError;
  }

  const rawUser = data as AppUserRecord;
  return {
    user: mapToUser(rawUser)
  };
}

export async function findUserByEmail(email: string): Promise<AppUserRow | null> {
  const normalizedEmail = normalizeEmail(email);

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("id, email, password_hash, full_name, role, is_active, created_at, updated_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    if ("code" in error && error.code === "PGRST116") {
      return null;
    }

    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as AppUserRow;
}

export async function findUserById(id: string): Promise<AppUserRow | null> {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select("id, email, password_hash, full_name, role, is_active, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if ("code" in error && error.code === "PGRST116") {
      return null;
    }

    throw new Error(`Failed to fetch user by id: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as AppUserRow;
}

export async function updateUserTimestamp(userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from(USERS_TABLE)
    .update({ updated_at: now })
    .eq("id", userId);

  if (error) {
    console.warn(`Failed to update user ${userId} timestamp`, error);
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(user: AppUser): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    isActive: user.isActive
  };

  const options: SignOptions = {
    expiresIn: TOKEN_EXPIRATION
  };

  return jwt.sign(payload, env.jwtSecret as Secret, options);
}

export function decodeToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export function mapToUser(record: UserRowLike): AppUser {
  return {
    id: record.id,
    email: record.email,
    fullName: record.full_name,
    role: record.role,
    isActive: record.is_active,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
