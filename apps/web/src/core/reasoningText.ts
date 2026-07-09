export function stripSyntheticReasoningStatus(value: string): string {
  return value.replace(/^Generating\.\.\.\s*/i, "");
}
