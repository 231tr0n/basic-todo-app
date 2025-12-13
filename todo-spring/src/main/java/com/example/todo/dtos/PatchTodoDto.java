package com.example.todo.dtos;

import com.example.todo.enums.StatusEnum;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PatchTodoDto {
  @NotNull private long id;
  @NotNull private StatusEnum status;
}
