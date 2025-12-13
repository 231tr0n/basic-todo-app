package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateTodoDto {
  @NotNull private String title;
  @NotNull private String description;
}
