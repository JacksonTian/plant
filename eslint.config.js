import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        describe: "readonly", // 添加 describe 全局变量
        it: "readonly"        // 添加 it 全局变量
      }
    },
    rules: {
      "indent": ["error", 2],
      "no-trailing-spaces": "error",
      "no-unused-vars": ["error", { args: "none" }] // 修改规则以忽略未使用的局部变量
    }
  },
  pluginJs.configs.recommended,
];