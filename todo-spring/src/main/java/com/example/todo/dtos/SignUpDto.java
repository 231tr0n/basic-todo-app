package com.example.todo.dtos;

import com.example.todo.enums.RoleEnum;
import java.util.Set;
import lombok.Data;

@Data
public class SignUpDto {
  private String username;
  private String password;
  private Set<RoleEnum> roles;
}
