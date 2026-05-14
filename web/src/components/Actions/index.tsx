import React from "react";
import { ActionResultToast } from "./ActionResultToast";
import { BranchCreateModal } from "./BranchCreateModal";
import { BranchRenameModal } from "./BranchRenameModal";
import { CherryPickModal } from "./CherryPickModal";
import { ConfirmModal } from "./ConfirmModal";
import { MergeModal } from "./MergeModal";
import { PushModal } from "./PushModal";
import { RebaseModal } from "./RebaseModal";
import { ResetModal } from "./ResetModal";
import { RevertModal } from "./RevertModal";
import { StashCreateModal } from "./StashCreateModal";
import { TagCreateModal } from "./TagCreateModal";

export const ActionsRoot: React.FC = () => (
  <>
    <ConfirmModal />
    <BranchCreateModal />
    <BranchRenameModal />
    <MergeModal />
    <RebaseModal />
    <CherryPickModal />
    <RevertModal />
    <ResetModal />
    <TagCreateModal />
    <StashCreateModal />
    <PushModal />
    <ActionResultToast />
  </>
);
