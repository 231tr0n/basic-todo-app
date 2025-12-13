package com.example.todo.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignInDto {
  @NotBlank private String username;
  @NotBlank private String password;
}
