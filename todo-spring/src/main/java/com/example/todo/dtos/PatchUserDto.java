package com.example.todo.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PatchUserDto {
  @NotNull
  @Size(min = 1, max = 255)
  private String oldPassword;

  @NotNull
  @Size(min = 1, max = 255)
  private String newPassword;
}
