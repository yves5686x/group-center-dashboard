import { CloseOutlined, MenuOutlined } from '@ant-design/icons';
import { Anchor, Button, Empty, Skeleton } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { history, useLocation } from 'umi';

import GpuDashboard from '@/components/Machine/GpuDashboard';
import { FilterGroup } from '@/components/Machine/GpuDashboard/Filter';
import VShow from '@/components/Vue/V-Show';
import { getLatestRunGpu, setLatestRunGpu } from '@/data/cookies/Gpu';
import { useGpuTaskFilterCardStore } from '@/data/store/modules/filter/GpuTaskFilterCard';
import { useGpuTaskFilterMachineStore } from '@/data/store/modules/filter/GpuTaskFilterMachine';
import { useGpuTaskFilterMultiGpuStore } from '@/data/store/modules/filter/GpuTaskFilterMultiGpu';
import { useGpuTaskFilterProjectNameStore } from '@/data/store/modules/filter/GpuTaskFilterProjectName';
import { useGpuTaskFilterUserNameStore } from '@/data/store/modules/filter/GpuTaskFilterUserName';
import { useRealtimeMachineList } from '@/hooks/useRealtime';
import { parseGpuIds, parseGpuRange } from '@/utils/urlParams';
import styles from './GpuDashboardPageContent.less';

interface Props {
  name?: string;
}

/**
 * GPU 机器列表。
 *
 * 改走同源聚合层 `/web/open/realtime/machines`：
 *   - 用 `gpu` 字段过滤（JSON key 就是 gpu，没有 isGpu）
 *   - 顺带拿到 agentOnline / stale，筛选器上可以直接画在线徽标
 *   - 5s 轮询，后端有 5s TTL 缓存与去重，不会压垮 agent
 */
const useGpuMachineList = () => {
  const { data, loading, error } = useRealtimeMachineList();

  const machineList = useMemo(
    () => (data ?? []).filter((machine) => machine.gpu === true),
    [data],
  );

  // 轮询每 5s 就会给一个新的数组引用，但页面里那个「恢复选中名单」的 effect
  // 只应该在**机器集合真的变了**的时候重跑，否则每轮都会把用户手动清空的选择
  // 又填回去。所以这里额外算一个只由标识组成的签名作为依赖。
  const machineListSignature = useMemo(
    () => machineList.map((machine) => machine.serverNameEng).join('|'),
    [machineList],
  );

  return { machineList, machineListSignature, loading, error };
};

interface GpuDashboardWithNoContentProps {
  machineList: API.RealtimeMachine[] | null;
}

const GpuDashboardWithNoContent: React.FC<GpuDashboardWithNoContentProps> = ({
  machineList,
}) => {
  const [showAnchor, setShowAnchor] = useState(() => {
    return window.innerWidth > window.innerHeight; // 横屏默认显示，竖屏默认隐藏
  });
  const [isAnimating, setIsAnimating] = useState(false);

  // 监听屏幕方向变化
  useEffect(() => {
    const handleResize = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setShowAnchor(isLandscape);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 处理锚点显示/隐藏动画
  const handleToggleAnchor = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setShowAnchor(!showAnchor);

    // 动画结束后重置状态
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  if (!machineList) {
    return <></>;
  }

  return (
    <VShow v-show={machineList !== undefined && machineList.length > 0}>
      {/* 浮动在右边的设备导航锚点 */}
      {machineList.length > 1 && (
        <>
          {/* 锚点容器 */}
          <div
            style={{
              position: 'fixed',
              right: window.innerWidth > 768 ? 20 : 8,
              top: window.innerWidth > 768 ? '50%' : 'auto',
              bottom: window.innerWidth > 768 ? 'auto' : 80,
              transform:
                window.innerWidth > 768
                  ? `translateY(-50%) translateX(${showAnchor ? '0' : '100%'})`
                  : `translateX(${showAnchor ? '0' : '100%'})`,
              zIndex: 1000,
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: showAnchor ? 1 : 0,
              pointerEvents: showAnchor ? 'auto' : 'none',
              maxWidth: window.innerWidth > 768 ? 'auto' : '90vw',
            }}
          >
            <Anchor
              affix={true}
              offsetTop={window.innerWidth > 768 ? 100 : 60}
              style={{
                backgroundColor: 'var(--ant-color-bg-container)',
                padding: window.innerWidth > 768 ? '12px' : '8px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                border: '1px solid var(--ant-color-border)',
                backdropFilter: 'blur(8px)',
                maxHeight: window.innerWidth > 768 ? '60vh' : '40vh',
                overflowY: 'auto',
                minWidth: window.innerWidth > 768 ? '120px' : '100px',
                transition: 'all 0.3s ease',
              }}
              // href 必须和 GpuDashboard 里那个 id 用同一个键。
              // 旧实现 id 用 machineName、href 也用 machineName，看起来是自洽的，
              // 但展示名里带空格和加号（"3090 + 1080Ti"）时 anchor 会跳不过去；
              // 现在统一成 serverNameEng。
              items={machineList.map((machine) => ({
                key: machine.serverNameEng,
                href: `#device-${machine.serverNameEng}`,
                title:
                  window.innerWidth > 768
                    ? machine.serverName
                    : machine.serverName.length > 8
                      ? `${machine.serverName.substring(0, 8)}...`
                      : machine.serverName,
              }))}
            />
          </div>

          {/* 切换按钮 - 跟随锚点位置 */}
          <Button
            type="primary"
            shape="circle"
            icon={showAnchor ? <CloseOutlined /> : <MenuOutlined />}
            onClick={handleToggleAnchor}
            style={{
              position: 'fixed',
              right:
                window.innerWidth > 768
                  ? showAnchor
                    ? 140
                    : 20
                  : showAnchor
                    ? 100
                    : 8,
              top: window.innerWidth > 768 ? '50%' : 'auto',
              bottom: window.innerWidth > 768 ? 'auto' : 20,
              transform: window.innerWidth > 768 ? 'translateY(-50%)' : 'none',
              zIndex: 1001,
              width: window.innerWidth > 768 ? 50 : 44,
              height: window.innerWidth > 768 ? 50 : 44,
              backgroundColor: 'var(--ant-color-bg-container)',
              borderColor: 'var(--ant-color-border)',
              color: 'var(--ant-color-text)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            disabled={isAnimating}
          />
        </>
      )}

      <div className={styles.machineDiv}>
        {machineList.map((machine) => (
          <div key={machine.serverNameEng} className={styles.machineItem}>
            <GpuDashboard machine={machine} />
          </div>
        ))}
      </div>
    </VShow>
  );
};

const GpuDashboardPageContent: React.FC<Props> = () => {
  const location = useLocation();

  const { machineList, machineListSignature, loading, error } =
    useGpuMachineList();

  // 选中的机器标识（serverNameEng）。
  // 只存标识、不存对象：轮询每 5s 给一份新的机器对象，如果状态里存的是对象，
  // 那么 agentOnline / stale 这些字段就会一直停留在选中那一刻的旧值上。
  const [selectedMachineKeys, setSelectedMachineKeys] = useState<
    string[] | null
  >(null);

  // 渲染用的机器对象每次都从实时列表里重新映射
  const selectedMachineState = useMemo(() => {
    if (selectedMachineKeys === null) {
      return null;
    }
    return machineList.filter((machine) =>
      selectedMachineKeys.includes(machine.serverNameEng),
    );
  }, [machineList, selectedMachineKeys]);

  // 获取过滤器状态管理
  const setUserNameEng = useGpuTaskFilterUserNameStore(
    (state) => state.setUserNameEng,
  );
  const setIsFuzzyMatchUser = useGpuTaskFilterUserNameStore(
    (state) => state.setIsFuzzyMatch,
  );
  const setProjectName = useGpuTaskFilterProjectNameStore(
    (state) => state.setProjectName,
  );
  const setIsFuzzyMatchProject = useGpuTaskFilterProjectNameStore(
    (state) => state.setIsFuzzyMatch,
  );
  const setGpuIdFilter = useGpuTaskFilterCardStore(
    (state) => state.setGpuIdFilter,
  );
  const setGpuIdFilterEnabled = useGpuTaskFilterCardStore(
    (state) => state.setGpuIdFilterEnabled,
  );
  const setMultiGpuFilter = useGpuTaskFilterMultiGpuStore(
    (state) => state.setMultiGpuFilter,
  );
  const setSelectedMachineNames = useGpuTaskFilterMachineStore(
    (state) => state.setSelectedMachineNames,
  );
  const selectedMachineNames = useGpuTaskFilterMachineStore(
    (state) => state.selectedMachineNames,
  );

  // 解析URL参数：/gpu-dashboard?4090a 这种没有键名的简化写法
  const getUrlMachineName = () => {
    const searchParams = new URLSearchParams(location.search);
    const search = location.search;

    // 如果search不为空，尝试从search中提取简化参数
    if (search && search.length > 1) {
      // 去掉开头的'?'字符
      const paramValue = search.substring(1);

      // 检查是否是简化格式参数（没有键名，只有值）
      if (
        !searchParams.has('user') &&
        !searchParams.has('project') &&
        !searchParams.has('gpuIds') &&
        !searchParams.has('gpuRange') &&
        !searchParams.has('multiGpu') &&
        !searchParams.has('nameEng')
      ) {
        return paramValue;
      }
    }

    return null;
  };

  // 解析过滤器URL参数并设置过滤器状态
  const parseFilterParams = () => {
    const searchParams = new URLSearchParams(location.search);
    let hasFilterParams = false;

    // 解析用户名过滤器
    const userParam = searchParams.get('user');
    if (userParam) {
      setUserNameEng(userParam);
      setIsFuzzyMatchUser(true); // 默认使用模糊匹配
      hasFilterParams = true;
    }

    // 解析工程名过滤器
    const projectParam = searchParams.get('project');
    if (projectParam) {
      setProjectName(projectParam);
      setIsFuzzyMatchProject(true); // 默认使用模糊匹配
      hasFilterParams = true;
    }

    // 解析GPU ID过滤器
    const gpuIdsParam = searchParams.get('gpuIds');
    if (gpuIdsParam) {
      const gpuIds = parseGpuIds(gpuIdsParam);
      if (gpuIds.length > 0) {
        setGpuIdFilter(gpuIds, undefined);
        setGpuIdFilterEnabled(true);
        hasFilterParams = true;
      }
    }

    // 解析GPU范围过滤器
    const gpuRangeParam = searchParams.get('gpuRange');
    if (gpuRangeParam) {
      const gpuRange = parseGpuRange(gpuRangeParam);
      if (gpuRange) {
        setGpuIdFilter([], gpuRange);
        setGpuIdFilterEnabled(true);
        hasFilterParams = true;
      }
    }

    // 解析多GPU过滤器
    const multiGpuParam = searchParams.get('multiGpu');
    if (multiGpuParam) {
      // 将字符串转换为对应的枚举值
      if (multiGpuParam === 'true') {
        setMultiGpuFilter('multi');
      } else if (multiGpuParam === 'false') {
        setMultiGpuFilter('single');
      } else {
        setMultiGpuFilter('none');
      }
      hasFilterParams = true;
    }

    return hasFilterParams;
  };

  /**
   * 按 URL 参数匹配机器。
   *
   * 旧实现拿 machineUrl（`/gpu/3090`）和 urlKeywords 来匹配，这两个字段聚合层
   * 已经不再返回。实测 `serverNameEng` 恰好就是 machineUrl 的最后一段，所以
   * `?3090`、`?nameEng=3090` 这类老链接的行为保持不变。
   */
  const matchMachinesByUrlParam = (urlParam: string) => {
    const normalized = urlParam.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return machineList.filter((machine) => {
      const serverNameEng = machine.serverNameEng?.toLowerCase() ?? '';
      const serverName = machine.serverName?.toLowerCase() ?? '';

      // 1. 精确匹配标识（旧链接最常见的形态）
      if (serverNameEng === normalized) {
        return true;
      }

      // 2. 标识包含参数，或参数包含标识（兼容 /gpu/3090 这种带前缀的老写法）
      if (serverNameEng && normalized.includes(serverNameEng)) {
        return true;
      }

      // 3. 展示名匹配
      return serverName.includes(normalized);
    });
  };

  // 解析机器nameEng参数并设置机器选择
  const parseMachineNameEngParam = () => {
    const searchParams = new URLSearchParams(location.search);
    const nameEngParam = searchParams.get('nameEng');

    if (nameEngParam && machineList.length > 0) {
      const matchedMachines = matchMachinesByUrlParam(nameEngParam);

      if (matchedMachines.length > 0) {
        applyMachineSelection(matchedMachines);
        return true;
      }
    }

    return false;
  };

  // 删除URL中的过滤器参数
  const removeFilterParamsFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    const filterKeys = [
      'user',
      'project',
      'gpuIds',
      'gpuRange',
      'multiGpu',
      'nameEng',
    ];

    let hasRemoved = false;
    filterKeys.forEach((key) => {
      if (searchParams.has(key)) {
        searchParams.delete(key);
        hasRemoved = true;
      }
    });

    if (hasRemoved) {
      const newSearch = searchParams.toString();
      const newUrl = newSearch
        ? `${location.pathname}?${newSearch}`
        : location.pathname;

      history.replace(newUrl);
    }
  };

  /** 写入选中结果，同时落到 zustand 与 cookie 两层持久化 */
  const applyMachineSelection = (machines: API.RealtimeMachine[]) => {
    const keys = machines.map((machine) => machine.serverNameEng);

    setSelectedMachineKeys(keys);
    setSelectedMachineNames(keys);
    setLatestRunGpu(keys).catch(() => {
      // cookie 写失败（隐私模式等）不影响本次会话的选择
    });
  };

  // 恢复选中名单只该做一次：URL 参数被 history.replace 抹掉后 location.search
  // 会变，effect 会再跑一遍，如果不加这个闸门，用户手动「清空」的选择会被
  // 持久化名单重新覆盖回来。机器集合真的变了（签名变）时才重新开闸。
  const hasRestoredSelectionRef = useRef(false);
  useEffect(() => {
    hasRestoredSelectionRef.current = false;
  }, [machineListSignature]);

  useEffect(() => {
    if (machineList.length === 0) {
      return;
    }

    const urlMachineName = getUrlMachineName();

    // 解析过滤器参数
    const hasFilterParams = parseFilterParams();
    if (hasFilterParams) {
      // 延迟删除过滤器参数，确保状态已经设置
      setTimeout(() => {
        removeFilterParamsFromUrl();
      }, 100);
    }

    // 解析机器nameEng参数
    const hasMachineNameEng = parseMachineNameEngParam();
    if (hasMachineNameEng) {
      // 延迟删除nameEng参数
      setTimeout(() => {
        const searchParams = new URLSearchParams(location.search);
        if (searchParams.has('nameEng')) {
          searchParams.delete('nameEng');
          const newSearch = searchParams.toString();
          const newUrl = newSearch
            ? `${location.pathname}?${newSearch}`
            : location.pathname;
          history.replace(newUrl);
        }
      }, 100);
      return;
    }

    // 处理简化格式的URL参数（如 ?4090a 或 ?2084）
    if (urlMachineName) {
      const matchedMachines = matchMachinesByUrlParam(urlMachineName);

      if (matchedMachines.length > 0) {
        applyMachineSelection(matchedMachines);

        // 如果只有简化格式参数，也删除它
        if (!hasFilterParams) {
          setTimeout(() => {
            history.replace(location.pathname);
          }, 100);
        }
        return;
      }
    }

    if (hasRestoredSelectionRef.current) {
      return;
    }
    hasRestoredSelectionRef.current = true;

    // 没有 URL 参数，按「持久化名单 → cookie → 全选」的顺序恢复
    const restoredFromPersisted = selectedMachineNames
      .map((name) =>
        machineList.find((machine) => machine.serverNameEng === name),
      )
      .filter((machine): machine is API.RealtimeMachine => !!machine);

    if (restoredFromPersisted.length > 0) {
      setSelectedMachineKeys(
        restoredFromPersisted.map((machine) => machine.serverNameEng),
      );
      return;
    }

    getLatestRunGpu().then((latestKeys) => {
      const restoredFromCookie = latestKeys
        .map((key) =>
          machineList.find((machine) => machine.serverNameEng === key),
        )
        .filter((machine): machine is API.RealtimeMachine => !!machine);

      if (restoredFromCookie.length > 0) {
        setSelectedMachineKeys(
          restoredFromCookie.map((machine) => machine.serverNameEng),
        );
        return;
      }

      // 两层持久化都匹配不上（第一次用、机器被改名、或后端换了配置）。
      // 旧实现在这里会 setSelectedMachineState([])，而空态判断只看完整列表，
      // 于是页面变成一片空白且没有任何提示 —— 必须回退到全选。
      setSelectedMachineKeys(machineList.map((m) => m.serverNameEng));
    });
  }, [machineListSignature, location.search]);

  const onSelectedMachineChange = (machines: API.RealtimeMachine[]) => {
    applyMachineSelection(machines);
  };

  // 机器列表还在路上：这和「一台 GPU 机器都没有」是两回事，不能混成一个提示
  if (loading && machineList.length === 0) {
    return (
      <div className={styles.pageContentDiv}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (machineList.length === 0) {
    return (
      <div className={styles.pageContentDiv}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ fontSize: 13 }}>
              <div>没有可用的 GPU 服务器</div>
              <div style={{ marginTop: 4, opacity: 0.65 }}>
                {error ??
                  '后端 /web/open/realtime/machines 没有返回 gpu=true 的机器'}
              </div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.pageContentDiv}>
      {/* 筛选器组 */}
      <FilterGroup
        machineList={machineList}
        selectedMachines={selectedMachineState || []}
        onSelectionChange={onSelectedMachineChange}
      />

      {selectedMachineState && selectedMachineState.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ fontSize: 13 }}>
              <div>已清空机器选择</div>
              <div style={{ marginTop: 4, opacity: 0.65 }}>
                在上方「GPU服务器筛选」里点「全选」或勾选任意机器
              </div>
            </div>
          }
        />
      ) : (
        <GpuDashboardWithNoContent machineList={selectedMachineState} />
      )}
    </div>
  );
};

export default GpuDashboardPageContent;
