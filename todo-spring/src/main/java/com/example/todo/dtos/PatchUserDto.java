package com.example.todo.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PatchUserDto {
  @NotBlank private String oldPassword;
  @NotBlank private String newPassword;
}
