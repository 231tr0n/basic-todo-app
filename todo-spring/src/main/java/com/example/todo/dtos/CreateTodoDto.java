package com.example.todo.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTodoDto {
  @NotBlank private String title;
  @NotBlank private String description;
}
