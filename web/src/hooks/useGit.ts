import type { CommitRow } from "@/types/git";
import { useQuery } from "@tanstack/react-query";
import { gitService } from "../services/git.service";

export default function useGit() {
  const {
    data: commits = [],
    isLoading: loading,
    error,
    refetch: fetchLog,
  } = useQuery<CommitRow[], Error>({
    queryKey: ["bootstrap"],
    queryFn: async () => {
      const bs = await gitService.bootstrap();
      return bs.firstPage.commits.map((c) => ({ ...c, refs: [] }));
    },
    refetchOnWindowFocus: false,
  });

  return {
    commits,
    loading,
    error: error?.message || null,
    fetchLog,
  };
}
