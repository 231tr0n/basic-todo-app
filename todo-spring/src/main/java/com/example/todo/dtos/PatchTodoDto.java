package com.example.todo.dtos;

import com.example.todo.enums.StatusEnum;
import lombok.Data;

@Data
public class PatchTodoDto {
  private long id;
  private StatusEnum status;
}
