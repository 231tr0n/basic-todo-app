package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PatchUserDto {
  @NotNull private String oldPassword;
  @NotNull private String newPassword;
}
