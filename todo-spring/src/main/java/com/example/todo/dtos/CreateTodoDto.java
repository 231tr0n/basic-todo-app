package com.example.todo.dtos;

import lombok.Data;

@Data
public class CreateTodoDto {
  private String title;
  private String description;
}
