using UnityEngine;

public class Bob_Movement : MonoBehaviour
{
    public float speed = 10f;
    
    void Update()
    {
        float h = Input.GetAxis("Horizontal");
        float v = Input.GetAxis("Vertical");
        transform.Translate(new Vector3(h, v, 0) * (speed * Time.deltaTime));
    }

   
}
