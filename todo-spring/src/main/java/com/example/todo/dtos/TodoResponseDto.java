package com.example.todo.dtos;

import com.example.todo.entities.TodoEntity;
import com.example.todo.entities.TodoEntity.StatusEnum;

public record TodoResponseDto(long id, String title, String description, StatusEnum status) {
  public static TodoResponseDto from(TodoEntity todo) {
    return new TodoResponseDto(
        todo.getId(), todo.getTitle(), todo.getDescription(), todo.getStatus());
  }
}
