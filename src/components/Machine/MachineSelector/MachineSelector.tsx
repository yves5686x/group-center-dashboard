import { Cascader } from 'antd';
import React, { useEffect } from 'react';

type MachineSelectorProps = {
  machineList: API.RealtimeMachine[];
  onMachineChange?: (selectedMachine: API.RealtimeMachine[]) => void;
  multipleMachine?: boolean;
  tryToSelectMachineList?: API.RealtimeMachine[];
};

interface Option {
  value: string;
  label: string;
  children?: Option[];
}

const MachineSelector: React.FC<MachineSelectorProps> = ({
  machineList,
  onMachineChange,
  multipleMachine,
  tryToSelectMachineList,
}) => {
  const supportMultipleMachine = multipleMachine ?? false;

  // First level
  // machineList[i].position

  // Second level
  // machineList[i].serverName

  // 级联选项的 value 用 serverNameEng：它既是聚合层的路径参数，
  // 也保证在同一 position 下唯一（展示名 serverName 可能重名或被改名）。

  const positionOptions: Option[] = [];

  const TAG_ALL_MACHINE = 'allMachineOption';
  if (supportMultipleMachine) {
    positionOptions.push({
      value: TAG_ALL_MACHINE,
      label: '全部机器',
    });
  }

  // Get all positions and not duplicated
  let count = 0;
  for (let i = 0; i < machineList.length; i++) {
    const position = machineList[i].position;
    if (
      positionOptions.find((element) => element.label === position) ===
      undefined
    ) {
      positionOptions.push({
        value: (++count).toString(),
        label: position,
      });
    }
  }

  for (let i = 0; i < machineList.length; i++) {
    for (let j = 0; j < positionOptions.length; j++) {
      const position = machineList[i].position;
      const currentPosition = positionOptions[j].label;
      if (position === currentPosition) {
        if (positionOptions[j].children === undefined) {
          positionOptions[j].children = [];
        }

        // @ts-ignore
        positionOptions[j].children.push({
          value: machineList[i].serverNameEng,
          label: machineList[i].serverName,
        });
      }
    }
  }

  const onChange = (value: string[]) => {
    // console.log('onMachineChange', value);

    // All Machine
    if (
      supportMultipleMachine &&
      value.length === 1 &&
      value[0] === TAG_ALL_MACHINE
    ) {
      if (onMachineChange) {
        onMachineChange([...machineList]);
      }
    }

    // Singla Machine
    const selectedMachine = machineList.find(
      (machine) => machine.serverNameEng === value[1],
    );
    if (selectedMachine) {
      // console.log('onMachineChange', selectedMachine);
      if (onMachineChange) {
        onMachineChange([selectedMachine]);
      }
    }
  };

  const [defaultValue, setDefaultValue] = React.useState<string[]>([]);

  const selecteMachine = (machine: API.RealtimeMachine) => {
    // Find selectedMachine in positionOptions and children

    for (let i = 0; i < positionOptions.length; i++) {
      const position = positionOptions[i];
      if (position.label === machine.position) {
        if (position.children === undefined) {
          position.children = [];
        }

        for (let j = 0; j < position.children.length; j++) {
          const child = position.children[j];
          if (child.value === machine.serverNameEng) {
            const value = [position.value, child.value];
            setDefaultValue(value);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (tryToSelectMachineList && tryToSelectMachineList.length > 0) {
      const selectedMachine = machineList.find(
        (machine) =>
          machine &&
          machine.serverNameEng === tryToSelectMachineList[0].serverNameEng,
      );
      if (selectedMachine) {
        selecteMachine(selectedMachine);
      }
    }
  }, [machineList, tryToSelectMachineList]);

  const style = {
    minWidth: '300px',
  };

  return (
    <>
      <Cascader
        options={positionOptions}
        onChange={onChange}
        defaultValue={defaultValue}
        placeholder="Please select"
        style={style}
      />
    </>
  );
};

export default MachineSelector;
