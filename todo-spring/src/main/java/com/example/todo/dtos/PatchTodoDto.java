package com.example.todo.dtos;

import com.example.todo.entities.TodoEntity.StatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PatchTodoDto {
  @NotNull private StatusEnum status;
}
