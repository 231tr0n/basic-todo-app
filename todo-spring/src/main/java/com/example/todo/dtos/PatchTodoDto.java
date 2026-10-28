package com.example.todo.dtos;

import com.example.todo.entities.TodoEntity.StatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PatchTodoDto {
  @NotNull private StatusEnum status;
}
