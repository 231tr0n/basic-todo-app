package com.example.todo.dtos;

import lombok.Data;

@Data
public class PatchUserDto {
  private String oldPassword;
  private String newPassword;
}
