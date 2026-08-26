import {
  useUpdateRepairMutation,
  useUpdateRepairStatusMutation,
  type RepairStatus,
} from '@/entities/repair-order';

export function shouldAutoSendQuoteForApproval(status?: RepairStatus | null): boolean {
  return status !== 'done' && status !== 'completed';
}

export function useSendQuoteForApproval(repairId?: string, status?: RepairStatus | null) {
  const [updateRepair] = useUpdateRepairMutation();
  const [updateStatus] = useUpdateRepairStatusMutation();

  const sendQuoteForApproval = async (): Promise<boolean> => {
    if (!repairId || !shouldAutoSendQuoteForApproval(status)) {
      return false;
    }

    try {
      await updateStatus({
        repairId,
        status: 'pending_approval',
      }).unwrap();
    } catch {
      await updateRepair({
        repairId,
        body: {
          status: 'pending_approval',
          estimate_status: 'pending',
        },
      }).unwrap();
    }

    return true;
  };

  return { sendQuoteForApproval };
}
