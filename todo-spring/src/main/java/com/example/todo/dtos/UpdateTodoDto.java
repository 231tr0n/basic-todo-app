package com.example.todo.dtos;

import lombok.Data;

@Data
public class UpdateTodoDto {
  private long id;
  private String title;
  private String description;
}
