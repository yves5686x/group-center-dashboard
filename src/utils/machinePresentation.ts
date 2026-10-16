/** Display labels and layout use stable IDs; API paths keep their original IDs. */
export const GPU_MACHINE_ROWS = [
  ['3090', '2082'],
  ['2084'],
  ['4090a', '4090b'],
  ['4098a'],
  ['4098b'],
] as const;

const machineOrder: readonly string[] = GPU_MACHINE_ROWS.flat();

export const getMachineDisplayName = (machine: {
  serverNameEng?: string;
  serverName?: string;
}) => {
  const id = machine.serverNameEng?.trim().toLowerCase();
  return id && machineOrder.includes(id)
    ? id
    : machine.serverName || machine.serverNameEng || '未知服务器';
};

export const sortGpuMachines = <T extends { serverNameEng: string }>(
  machines: T[],
): T[] =>
  [...machines].sort((left, right) => {
    const rank = (id: string) => {
      const index = machineOrder.indexOf(id.toLowerCase());
      return index < 0 ? machineOrder.length : index;
    };
    return rank(left.serverNameEng) - rank(right.serverNameEng);
  });

export const groupGpuMachines = <T extends { serverNameEng: string }>(
  machines: T[],
): T[][] => {
  const knownRows = GPU_MACHINE_ROWS.map((ids) =>
    sortGpuMachines(machines).filter((machine) =>
      (ids as readonly string[]).includes(machine.serverNameEng.toLowerCase()),
    ),
  ).filter((row) => row.length > 0);
  const otherRows = machines
    .filter(
      (machine) => !machineOrder.includes(machine.serverNameEng.toLowerCase()),
    )
    .map((machine) => [machine]);
  return [...knownRows, ...otherRows];
};
