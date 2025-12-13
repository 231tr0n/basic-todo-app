package com.example.todo.dtos;

import com.example.todo.enums.RoleEnum;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;
import lombok.Data;

@Data
public class SignUpDto {
  @NotBlank private String username;
  @NotBlank private String password;
  @NotBlank private Set<RoleEnum> roles;
}
