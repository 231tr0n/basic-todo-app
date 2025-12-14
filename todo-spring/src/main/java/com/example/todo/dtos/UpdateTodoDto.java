package com.example.todo.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTodoDto {
  @NotNull
  @Min(value = 1)
  private long id;

  @Size(min = 1, max = 255)
  private String title;

  @Size(min = 1, max = 255)
  private String description;
}
