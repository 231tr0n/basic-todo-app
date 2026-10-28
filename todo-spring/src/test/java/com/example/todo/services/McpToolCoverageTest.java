package com.example.todo.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.ai.mcp.annotation.McpTool;
import org.springframework.ai.mcp.annotation.McpToolParam;
import org.springframework.transaction.annotation.Transactional;

class McpToolCoverageTest {
  private static final Set<String> EXPECTED_TOOLS =
      Set.of(
          "sign_up",
          "sign_in",
          "sign_out",
          "get_user",
          "get_users",
          "update_user",
          "patch_user",
          "delete_user",
          "create_todo",
          "get_todo",
          "get_todos",
          "update_todo",
          "patch_todo",
          "delete_todo",
          "delete_todos");

  @Test
  void exposesEveryApplicationTool() {
    Set<String> tools =
        Arrays.stream(GlobalService.class.getDeclaredMethods())
            .map(method -> method.getAnnotation(McpTool.class))
            .filter(annotation -> annotation != null)
            .map(McpTool::name)
            .collect(Collectors.toSet());

    assertThat(tools).isEqualTo(EXPECTED_TOOLS);
  }

  @Test
  void keepsEveryToolTransactional() {
    assertThat(
            Arrays.stream(GlobalService.class.getDeclaredMethods())
                .filter(method -> method.isAnnotationPresent(McpTool.class))
                .filter(method -> !method.isAnnotationPresent(Transactional.class))
                .map(Method::getName)
                .toList())
        .isEmpty();
  }

  @Test
  void describesEveryTool() {
    assertThat(
            Arrays.stream(GlobalService.class.getDeclaredMethods())
                .filter(method -> method.isAnnotationPresent(McpTool.class))
                .filter(method -> method.getAnnotation(McpTool.class).description().isBlank())
                .map(Method::getName)
                .toList())
        .isEmpty();
  }

  @Test
  void describesEveryToolParameter() {
    assertThat(
            Arrays.stream(GlobalService.class.getDeclaredMethods())
                .filter(method -> method.isAnnotationPresent(McpTool.class))
                .flatMap(
                    method ->
                        Arrays.stream(method.getParameters())
                            .filter(
                                parameter ->
                                    parameter.getAnnotation(McpToolParam.class) == null
                                        || parameter
                                            .getAnnotation(McpToolParam.class)
                                            .description()
                                            .isBlank())
                            .map(parameter -> method.getName() + "." + parameter.getName()))
                .toList())
        .isEmpty();
  }
}
