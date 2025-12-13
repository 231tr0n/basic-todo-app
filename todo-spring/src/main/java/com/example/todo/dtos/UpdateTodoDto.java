package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateTodoDto {
  @NotNull private long id;
  private String title;
  private String description;
}
