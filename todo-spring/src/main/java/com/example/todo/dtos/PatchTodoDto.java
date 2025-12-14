package com.example.todo.dtos;

import com.example.todo.enums.StatusEnum;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PatchTodoDto {
  @NotNull
  @Min(value = 1)
  private long id;

  @NotBlank private StatusEnum status;
}
