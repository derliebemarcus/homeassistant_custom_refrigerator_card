# System context diagram

```mermaid
flowchart LR
    User["User or operator"] --> Project["LG ThinQ Refrigerator Card"]
    External1["Home Assistant frontend"]
    External2["LG ThinQ integration"]
    External3["LG ThinQ refrigerator"]
    External4["HACS and GitHub Releases"]
    External5["Jenkins, SonarQube, Coveralls, and security scanners"]
    Project --> External1
```
