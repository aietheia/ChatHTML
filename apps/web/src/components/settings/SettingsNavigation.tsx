import {
  CreditCard,
  Eye,
  KeyRound,
  LogIn,
  Search,
  UserRound,
  X
} from "lucide-react";
import type { AccountMode } from "../../core/accountMode";
import type { AuthUser } from "../../core/cloudAuth";
import type { ProfileSettings } from "../../core/profileSettings";
import type { SettingsSection } from "../../features/settings/settingsDialogModel";
import { ProfileAvatar } from "../ProfileAvatar";
import packageJson from "../../../package.json";

const APP_VERSION = packageJson.version;
const APP_COMMIT =
  typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "development";

type SettingsNavigationProps = {
  section: SettingsSection;
  cloudEnabled: boolean;
  accountMode: AccountMode;
  profileSettings: ProfileSettings;
  authUser?: AuthUser | null;
  onSectionChange(section: SettingsSection): void;
  onLoginRequest?(): void;
  onClose(): void;
};

export function SettingsNavigation({
  section,
  cloudEnabled,
  accountMode,
  profileSettings,
  authUser,
  onSectionChange,
  onLoginRequest,
  onClose
}: SettingsNavigationProps) {
  return (
    <aside className="settings-nav" aria-label="Settings sections">
      <button
        className="settings-close-button"
        type="button"
        aria-label="Close settings"
        onClick={onClose}
      >
        <X size={17} strokeWidth={2.1} aria-hidden="true" />
      </button>
      <button
        className={`settings-nav-item ${
          section === "profile" ? "is-active" : ""
        }`}
        type="button"
        onClick={() => onSectionChange("profile")}
      >
        <UserRound size={18} strokeWidth={2.1} aria-hidden="true" />
        <span>Personal</span>
      </button>
      <button
        className={`settings-nav-item ${
          section === "api" ? "is-active" : ""
        }`}
        type="button"
        onClick={() => onSectionChange("api")}
      >
        <KeyRound size={18} strokeWidth={2.1} aria-hidden="true" />
        <span>Providers</span>
      </button>
      {cloudEnabled ? (
        <button
          className={`settings-nav-item ${
            section === "billing" ? "is-active" : ""
          }`}
          type="button"
          onClick={() => onSectionChange("billing")}
        >
          <CreditCard size={18} strokeWidth={2.1} aria-hidden="true" />
          <span>Billing</span>
        </button>
      ) : null}
      <button
        className={`settings-nav-item ${
          section === "display" ? "is-active" : ""
        }`}
        type="button"
        onClick={() => onSectionChange("display")}
      >
        <Eye size={18} strokeWidth={2.1} aria-hidden="true" />
        <span>Display</span>
      </button>
      <button
        className={`settings-nav-item ${
          section === "search" ? "is-active" : ""
        }`}
        type="button"
        onClick={() => onSectionChange("search")}
      >
        <Search size={18} strokeWidth={2.1} aria-hidden="true" />
        <span>Web Search</span>
      </button>
      <div className="settings-nav-footer">
        {authUser ? (
          <button
            className="settings-auth-entry is-authenticated"
            type="button"
            title={authUser.email}
            aria-label={`Open account settings for ${authUser.email}`}
            onClick={() => onSectionChange("profile")}
          >
            <UserRound size={17} strokeWidth={2.1} aria-hidden="true" />
            <span>{authUser.email}</span>
          </button>
        ) : accountMode === "local" ? (
          <button
            className="settings-auth-entry is-authenticated is-local"
            type="button"
            aria-label="Open local profile settings"
            onClick={() => onSectionChange("profile")}
          >
            <ProfileAvatar avatarDataUrl={profileSettings.avatarDataUrl} />
            <span>Local profile</span>
          </button>
        ) : cloudEnabled && onLoginRequest ? (
          <button
            className="settings-auth-entry"
            type="button"
            onClick={() => {
              onClose();
              onLoginRequest();
            }}
          >
            <LogIn size={17} strokeWidth={2.1} aria-hidden="true" />
            <span>Sign in</span>
          </button>
        ) : null}
        <div
          className="settings-build-meta"
          aria-label={`Version ${APP_VERSION}, commit ${APP_COMMIT}`}
        >
          <span>v{APP_VERSION}</span>
          <code>{APP_COMMIT}</code>
        </div>
      </div>
    </aside>
  );
}
