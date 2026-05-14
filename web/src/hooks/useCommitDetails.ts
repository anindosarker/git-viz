import type { GitCommitDetails, GitFileChange } from "@git-viz/shared";
import { useQuery } from "@tanstack/react-query";
import { gitService } from "../services/git.service";

export interface CommitDetailsState {
  hash: string;
  details?: GitCommitDetails;
  detailsLoading: boolean;
  detailsError?: string;
  files?: GitFileChange[];
  filesTruncated: boolean;
  filesLoading: boolean;
  filesError?: string;
}

export function useCommitDetails(hash: string | undefined): CommitDetailsState | null {
  const detailsQuery = useQuery({
    queryKey: ["commit:details", hash],
    queryFn: () => gitService.getCommitDetails(hash as string),
    enabled: !!hash,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const filesQuery = useQuery({
    queryKey: ["commit:files", hash],
    queryFn: () => gitService.getFileChanges(hash as string),
    enabled: !!hash,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (!hash) return null;

  return {
    hash,
    details: detailsQuery.data,
    detailsLoading: detailsQuery.isLoading,
    detailsError: detailsQuery.error ? String(detailsQuery.error) : undefined,
    files: filesQuery.data?.files,
    filesTruncated: filesQuery.data?.truncated ?? false,
    filesLoading: filesQuery.isLoading,
    filesError: filesQuery.error ? String(filesQuery.error) : undefined,
  };
}
