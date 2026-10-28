package com.example.todo.dtos;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateTodoDto {
  @Size(min = 1, max = 255)
  private String title;

  @Size(min = 1, max = 255)
  private String description;
}
