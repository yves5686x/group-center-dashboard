import {
  getOpaqueColor,
  getReadableTagColors,
  getReadableTextColor,
} from '@/utils/Convert/Contrast';
import { STATUS_TAG_COLORS } from '@/utils/StatusColors';
import type { TagProps } from 'antd';
import { Tag, theme } from 'antd';

type Props = TagProps & { accentColor?: string };

/** Preserve the grouping/status colour while keeping small labels readable. */
const ReadableTag: React.FC<Props> = ({
  accentColor,
  children,
  style,
  color,
  variant,
  ...props
}) => {
  const { token } = theme.useToken();
  if (props.disabled)
    return (
      <Tag {...props} style={style} color={color} variant={variant}>
        {children}
      </Tag>
    );

  const statusAccent = STATUS_TAG_COLORS[color ?? ''];
  const tagAccent = accentColor ?? statusAccent;
  if (tagAccent) {
    const colors = getReadableTagColors(
      tagAccent,
      token.colorBgContainer,
      token.colorText,
    );
    return (
      <Tag
        {...props}
        styles={(info) => {
          const semanticStyles =
            typeof props.styles === 'function'
              ? props.styles(info)
              : props.styles;
          return {
            ...semanticStyles,
            icon: {
              ...semanticStyles?.icon,
              ...(statusAccent ? { color: statusAccent } : {}),
            },
          };
        }}
        style={{
          ...style,
          color: colors.foreground,
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderInlineStartWidth: accentColor ? 3 : 1,
          fontWeight: 500,
        }}
      >
        {children}
      </Tag>
    );
  }

  const palette = token as typeof token & Record<string, string>;
  const name = color?.replace(/-inverse$/, '');
  const solid = variant === 'solid' || color?.endsWith('-inverse');
  const status = name
    ? (
        {
          success: 'Success',
          warning: 'Warning',
          error: 'Error',
          processing: 'Info',
        } as Record<string, string>
      )[name]
    : undefined;
  let background = getOpaqueColor(
    token.colorFillTertiary,
    token.colorBgContainer,
  );
  let foreground = token.colorText;

  if (status) {
    background = solid
      ? palette[`color${status}`]
      : palette[`color${status}Bg`];
    foreground = solid ? token.colorTextLightSolid : palette[`color${status}`];
  } else if (name && palette[`${name}1`]) {
    background = palette[`${name}${solid ? 6 : 1}`];
    foreground = solid ? token.colorTextLightSolid : palette[`${name}7`];
  } else if (color && color !== 'default') {
    background = color;
    foreground = token.colorTextLightSolid;
  } else if (solid) {
    background = token.colorBgSolid;
    foreground = token.colorTextLightSolid;
  }

  const textColor = getReadableTextColor(
    typeof style?.color === 'string' ? style.color : foreground,
    typeof style?.backgroundColor === 'string'
      ? style.backgroundColor
      : background,
  );
  return (
    <Tag
      {...props}
      color={color}
      variant={variant}
      style={{ ...style, color: textColor }}
    >
      {children}
    </Tag>
  );
};

export default ReadableTag;
