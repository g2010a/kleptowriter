/**
 * Versioning module for Kleptowriter Core.
 *
 * Version numbers are hardcoded here to keep core independent of package.json.
 * Root package.json version must be manually kept in sync with CURRENT_VERSION.
 */

export const CURRENT_VERSION = "0.4.0";
export const MANIFEST_SCHEMA_VERSION = 1;
export const STORY_SCHEMA_VERSION = 1;

/**
 * Returns the current version information for Kleptowriter Core.
 * @returns Object containing the core version and schema versions
 */
export function getCurrentVersion(): {
  kleptowriterVersion: string;
  manifestSchema: number;
  storySchema: number;
} {
  return {
    kleptowriterVersion: CURRENT_VERSION,
    manifestSchema: MANIFEST_SCHEMA_VERSION,
    storySchema: STORY_SCHEMA_VERSION,
  };
}