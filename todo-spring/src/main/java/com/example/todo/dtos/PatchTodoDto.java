package com.example.todo.dtos;

import com.example.todo.enums.StatusEnum;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PatchTodoDto {
  @NotNull
  @Min(value = 1)
  private long id;

  @NotNull
  @Size(min = 1, max = 255)
  private StatusEnum status;
}
