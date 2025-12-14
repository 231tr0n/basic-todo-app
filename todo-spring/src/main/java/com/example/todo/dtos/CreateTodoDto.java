package com.example.todo.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateTodoDto {
  @NotBlank
  @Size(min = 1, max = 255)
  private String title;

  @NotBlank
  @Size(min = 1, max = 255)
  private String description;
}
