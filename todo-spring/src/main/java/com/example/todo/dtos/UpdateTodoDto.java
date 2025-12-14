package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateTodoDto {
  @Size(min = 1, max = 255)
  private String title;

  @Size(min = 1, max = 255)
  private String description;
}
