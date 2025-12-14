package com.example.todo.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PatchUserDto {
  @NotBlank
  @Size(min = 1, max = 255)
  private String oldPassword;

  @NotBlank
  @Size(min = 1, max = 255)
  private String newPassword;
}
