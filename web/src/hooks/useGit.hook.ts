import type { CommitRow } from "@/types/git";
import { useQuery } from "@tanstack/react-query";
import gitDataService from "../services/git-data.service";

export default function useGit() {
  const {
    data: commits = [],
    isLoading: loading,
    error,
    refetch: fetchLog,
  } = useQuery<CommitRow[], Error>({
    queryKey: ["gitLog"],
    queryFn: () => gitDataService.getLog(),
    refetchOnWindowFocus: false, // Prevent excessive refetches in VS Code webview
  });

  return {
    commits,
    loading,
    error: error?.message || null,
    fetchLog,
  };
}
