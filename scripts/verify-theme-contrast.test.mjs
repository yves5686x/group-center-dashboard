import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import {
  getContrastRatio,
  getReadableAccentText,
  getReadableTagColors,
  getReadableTextColor,
} from '../src/utils/Convert/Contrast.ts';
import { STATUS_COLORS, STATUS_TAG_COLORS } from '../src/utils/StatusColors.ts';

const require = createRequire(import.meta.url);
const { theme } = require('antd');
const { presetPalettes } = require('@ant-design/colors');

const themes = [theme.defaultAlgorithm, theme.darkAlgorithm].map((algorithm) =>
  theme.getDesignToken({
    algorithm,
    token: {
      colorSuccess: STATUS_COLORS.success,
      colorWarning: STATUS_COLORS.warning,
      colorError: STATUS_COLORS.error,
    },
  }),
);

test('measures alpha-composited text rather than ignoring its opacity', () => {
  assert.equal(getContrastRatio('#000', '#fff'), 21);
  assert.equal(getContrastRatio('#fff', '#fff'), 1);
  assert.equal(getContrastRatio('rgba(0, 0, 0, 0)', '#fff'), 1);
  assert.ok(getContrastRatio('rgba(0, 0, 0, 0.45)', '#fff') < 4.5);
  assert.ok(getContrastRatio('rgba(0, 0, 0, 0.65)', '#fff') >= 4.5);
});

test('all palette shades and former ranking colours produce readable tags in both themes', () => {
  const accents = [
    ...Object.values(presetPalettes).flat(),
    ...Object.values(STATUS_COLORS),
    '#f50',
    '#2db7f5',
    '#87d068',
    '#fff',
    '#000',
  ];
  for (const token of themes) {
    for (const accent of accents) {
      const colors = getReadableTagColors(
        accent,
        token.colorBgContainer,
        token.colorText,
      );
      assert.ok(
        getContrastRatio(colors.foreground, colors.background) >= 4.5,
        `${accent} text on ${token.colorBgContainer}`,
      );
      assert.ok(
        getContrastRatio(colors.border, colors.background) >= 3,
        `${accent} border on ${token.colorBgContainer}`,
      );
    }
  }
});

test('semantic colours remain readable as small text on either card surface', () => {
  for (const token of themes) {
    for (const name of [
      'colorPrimary',
      'colorSuccess',
      'colorWarning',
      'colorError',
      'colorInfo',
      'colorTextSecondary',
    ]) {
      for (const surface of [token.colorBgContainer, token.colorBgElevated]) {
        const foreground = getReadableTextColor(
          {
            colorSuccess: STATUS_COLORS.success,
            colorWarning: STATUS_COLORS.warning,
            colorError: STATUS_COLORS.error,
          }[name] ?? token[name],
          surface,
        );
        assert.ok(
          getContrastRatio(foreground, surface) >= 4.5,
          `${name} on ${surface}`,
        );
      }
    }
  }
});

test('selected filters and links have readable theme colours, including hover', () => {
  for (const token of themes) {
    for (const surface of [
      token.colorBgContainer,
      token.colorPrimaryBg,
      token.colorPrimaryBgHover,
    ]) {
      assert.ok(
        getContrastRatio(
          getReadableAccentText(token.colorPrimary, [
            token.colorBgContainer,
            token.colorPrimaryBg,
            token.colorPrimaryBgHover,
          ]),
          surface,
        ) >= 4.5,
        `primary text on ${surface}`,
      );
    }
  }
});

test('native status and preset tag text is readable for outlined and solid variants', () => {
  for (const token of themes) {
    for (const name of Object.keys(presetPalettes)) {
      if (typeof token[`${name}1`] !== 'string') continue;
      for (const [foreground, background] of [
        [token[`${name}7`], token[`${name}1`]],
        [token.colorTextLightSolid, token[`${name}6`]],
      ]) {
        assert.ok(
          getContrastRatio(
            getReadableTextColor(foreground, background),
            background,
          ) >= 4.5,
          `${name} tag on ${background}`,
        );
      }
    }
    for (const name of ['Success', 'Warning', 'Error', 'Info']) {
      const background = token[`color${name}Bg`];
      const foreground = getReadableTextColor(
        token[`color${name}`],
        background,
      );
      assert.ok(getContrastRatio(foreground, background) >= 4.5, name);
    }
  }
});

test('keeps an already readable colour and safely falls back for unsupported input', () => {
  assert.equal(getReadableTextColor('#096dd9', '#fff'), '#096dd9');
  assert.equal(getReadableTextColor('currentColor', '#fff'), 'currentColor');
  assert.ok(Number.isNaN(getContrastRatio('not-a-colour', '#fff')));
  assert.ok(Number.isNaN(getContrastRatio('#000', 'rgba(255, 255, 255, 0.5)')));
});

test('legacy status names share the same traffic-light colours', () => {
  for (const [legacy, semantic] of [
    ['green', 'success'],
    ['orange', 'warning'],
    ['yellow', 'warning'],
    ['red', 'error'],
  ]) {
    assert.equal(STATUS_TAG_COLORS[legacy], STATUS_COLORS[semantic]);
    assert.equal(STATUS_TAG_COLORS[semantic], STATUS_COLORS[semantic]);
  }
});
